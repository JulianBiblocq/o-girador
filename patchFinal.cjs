const fs = require('fs');
let c = fs.readFileSync('src/hooks/useSequencerState.ts', 'utf8');

c = c.replace(/import \{ useAuth \} from '\.\.\/contexts\/AuthContext';/, "import { useAuth } from '../contexts/AuthContext';\nimport { useSequencerStore } from '../stores/useSequencerStore';");

c = c.replace(/const \[tracks, setTracks\] = useState<TrackGroup\[\]>\(\[\]\);/, "const tracks = useSequencerStore(state => state.tracks);\n  const setTracks = (useSequencerStore as any)(state => state.setTracks) as any;");

c = c.replace(/const \[totalMeasures, setTotalMeasures\] = useState<number>\(8\);/, "const totalMeasures = useSequencerStore(state => state.totalMeasures);\n  const setTotalMeasures = (useSequencerStore as any)(state => state.setTotalMeasures) as any;");

c = c.replace(/const \[measureTimeSigs, setMeasureTimeSigs\] = useState<TimeSignature\[\]>\(\(\) => Array\(8\)\.fill\('4\/4'\)\);/, "const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);\n  const setMeasureTimeSigs = (useSequencerStore as any)(state => state.setMeasureTimeSigs) as any;");

c = c.replace(/const \[songSections, setSongSections\] = useState<SongSection\[\]>\(\[\]\);/, "const songSections = useSequencerStore(state => state.songSections);\n  const setSongSections = (useSequencerStore as any)(state => state.setSongSections) as any;");

c = c.replace(/const \[loopStartMeasure, setLoopStartMeasure\] = useState<number \| null>\(null\);/, "const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);\n  const setLoopStartMeasure = (useSequencerStore as any)(state => state.setLoopStartMeasure) as any;");

c = c.replace(/const \[loopEndMeasure, setLoopEndMeasure\] = useState<number \| null>\(null\);/, "const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);\n  const setLoopEndMeasure = (useSequencerStore as any)(state => state.setLoopEndMeasure) as any;");

c = c.replace(/const \[isLoopRegionActive, setIsLoopRegionActive\] = useState<boolean>\(true\);/, "const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);\n  const setIsLoopRegionActive = (useSequencerStore as any)(state => state.setIsLoopRegionActive) as any;");

fs.writeFileSync('src/hooks/useSequencerState.ts', c);
