const fs = require('fs');
let c = fs.readFileSync('src/hooks/useSequencerState.ts', 'utf8');

c = c.replace(
  "import React, { useState, useCallback, useRef, useEffect } from 'react';",
  "import React, { useState, useCallback, useRef, useEffect } from 'react';\nimport { useSequencerStore } from '../stores/useSequencerStore';"
);

c = c.replace(
  "const [tracks, setTracks] = useState<TrackGroup[]>([]);",
  "const tracks = useSequencerStore(state => state.tracks);\n  const setTracks = useSequencerStore(state => state.setTracks);"
);

c = c.replace(
  "const [totalMeasures, setTotalMeasures] = useState<number>(8);",
  "const totalMeasures = useSequencerStore(state => state.totalMeasures);\n  const setTotalMeasures = useSequencerStore(state => state.setTotalMeasures);"
);

c = c.replace(
  "const [measureTimeSigs, setMeasureTimeSigs] = useState<TimeSignature[]>(() => Array(8).fill('4/4'));",
  "const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);\n  const setMeasureTimeSigs = useSequencerStore(state => state.setMeasureTimeSigs);"
);

c = c.replace(
  "const [songSections, setSongSections] = useState<SongSection[]>([]);",
  "const songSections = useSequencerStore(state => state.songSections);\n  const setSongSections = useSequencerStore(state => state.setSongSections);"
);

c = c.replace(
  "const [loopStartMeasure, setLoopStartMeasure] = useState<number | null>(null);",
  "const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);\n  const setLoopStartMeasure = useSequencerStore(state => state.setLoopStartMeasure);"
);

c = c.replace(
  "const [loopEndMeasure, setLoopEndMeasure] = useState<number | null>(null);",
  "const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);\n  const setLoopEndMeasure = useSequencerStore(state => state.setLoopEndMeasure);"
);

c = c.replace(
  "const [isLoopRegionActive, setIsLoopRegionActive] = useState<boolean>(true);",
  "const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);\n  const setIsLoopRegionActive = useSequencerStore(state => state.setIsLoopRegionActive);"
);

fs.writeFileSync('src/hooks/useSequencerState.ts', c);
