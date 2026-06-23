const fs = require('fs');
let c = fs.readFileSync('src/hooks/useSequencerState.ts', 'utf8');

const importTarget = "import { useAuth } from '../contexts/AuthContext';";
const importReplace = "import { useAuth } from '../contexts/AuthContext';\nimport { useSequencerStore } from '../stores/useSequencerStore';";
c = c.replace(importTarget, importReplace);

const stateTarget = `  const [tracks, setTracks] = useState<TrackGroup[]>([]);
  const [bpm, setBpm] = useState<number>(83);
  const [totalMeasures, setTotalMeasures] = useState<number>(8);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');

  const [measureTimeSigs, setMeasureTimeSigs] = useState<TimeSignature[]>(() => Array(8).fill('4/4'));
  const [measureBpms, setMeasureBpms] = useState<number[]>(() => Array(8).fill(83));
  const [measureBpmTransitions, setMeasureBpmTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const [measureVols, setMeasureVols] = useState<number[]>(() => Array(8).fill(100));
  const [measureVolTransitions, setMeasureVolTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [measureSignals, setMeasureSignals] = useState<(string | null)[]>(() => Array(8).fill(null));

  const [loopStartMeasure, setLoopStartMeasure] = useState<number | null>(null);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number | null>(null);
  const [isLoopRegionActive, setIsLoopRegionActive] = useState<boolean>(true);`;

const stateReplace = `  const tracks = useSequencerStore(state => state.tracks);
  const setTracks = (useSequencerStore as any)(state => state.setTracks) as any;
  const [bpm, setBpm] = useState<number>(83);
  const totalMeasures = useSequencerStore(state => state.totalMeasures);
  const setTotalMeasures = (useSequencerStore as any)(state => state.setTotalMeasures) as any;
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');

  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const setMeasureTimeSigs = (useSequencerStore as any)(state => state.setMeasureTimeSigs) as any;
  const [measureBpms, setMeasureBpms] = useState<number[]>(() => Array(8).fill(83));
  const [measureBpmTransitions, setMeasureBpmTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const [measureVols, setMeasureVols] = useState<number[]>(() => Array(8).fill(100));
  const [measureVolTransitions, setMeasureVolTransitions] = useState<('immediate' | 'ramp')[]>(() => Array(8).fill('immediate'));
  const songSections = useSequencerStore(state => state.songSections);
  const setSongSections = (useSequencerStore as any)(state => state.setSongSections) as any;
  const [measureSignals, setMeasureSignals] = useState<(string | null)[]>(() => Array(8).fill(null));

  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const setLoopStartMeasure = (useSequencerStore as any)(state => state.setLoopStartMeasure) as any;
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);
  const setLoopEndMeasure = (useSequencerStore as any)(state => state.setLoopEndMeasure) as any;
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);
  const setIsLoopRegionActive = (useSequencerStore as any)(state => state.setIsLoopRegionActive) as any;`;

c = c.replace(stateTarget, stateReplace);

fs.writeFileSync('src/hooks/useSequencerState.ts', c);
