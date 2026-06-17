/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TrackGroup, TimeSignature, SongSection } from '../types';

export function useSequencerState() {
  const [tracks, setTracks] = useState<TrackGroup[]>([]);
  const [bpm, setBpm] = useState<number>(83);
  const [totalMeasures, setTotalMeasures] = useState<number>(8);
  const [timeSig, setTimeSig] = useState<TimeSignature>('4/4');

  const [measureTimeSigs, setMeasureTimeSigs] = useState<TimeSignature[]>([]);
  const [measureBpms, setMeasureBpms] = useState<number[]>([]);
  const [measureBpmTransitions, setMeasureBpmTransitions] = useState<('immediate' | 'ramp')[]>([]);
  const [measureVols, setMeasureVols] = useState<number[]>([]);
  const [measureVolTransitions, setMeasureVolTransitions] = useState<('immediate' | 'ramp')[]>([]);
  const [songSections, setSongSections] = useState<SongSection[]>([]);
  const [measureSignals, setMeasureSignals] = useState<(string | null)[]>([]);

  const [loopStartMeasure, setLoopStartMeasure] = useState<number | null>(null);
  const [loopEndMeasure, setLoopEndMeasure] = useState<number | null>(null);

  // History states
  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const [tracksRedoHistory, setTracksRedoHistory] = useState<TrackGroup[][]>([]);
  
  const [songStructureHistory, setSongStructureHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);
  const [songStructureRedoHistory, setSongStructureRedoHistory] = useState<{
    measureTimeSigs: TimeSignature[];
    measureBpms: number[];
    measureBpmTransitions: ('immediate' | 'ramp')[];
    measureVols: number[];
    measureVolTransitions: ('immediate' | 'ramp')[];
    songSections?: SongSection[];
  }[]>([]);

  // Refs for audio scheduler and safe access
  const tracksRef = useRef<TrackGroup[]>([]);
  const totalMeasuresRef = useRef<number>(8);
  const measureTimeSigsRef = useRef<TimeSignature[]>([]);
  const measureBpmsRef = useRef<number[]>([]);
  const measureBpmTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const measureVolsRef = useRef<number[]>([]);
  const measureVolTransitionsRef = useRef<('immediate' | 'ramp')[]>([]);
  const songSectionsRef = useRef<SongSection[]>([]);
  const measureSignalsRef = useRef<(string | null)[]>([]);

  const loopStartRef = useRef<number | null>(null);
  const loopEndRef = useRef<number | null>(null);

  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const tracksRedoHistoryRef = useRef<TrackGroup[][]>([]);
  const songStructureHistoryRef = useRef<any[]>([]);
  const songStructureRedoHistoryRef = useRef<any[]>([]);

  // Keep refs in sync
  useEffect(() => {
    tracksRef.current = tracks;
    totalMeasuresRef.current = totalMeasures;
    measureTimeSigsRef.current = measureTimeSigs;
    measureBpmsRef.current = measureBpms;
    measureBpmTransitionsRef.current = measureBpmTransitions;
    measureVolsRef.current = measureVols;
    measureVolTransitionsRef.current = measureVolTransitions;
    songSectionsRef.current = songSections;
    measureSignalsRef.current = measureSignals;
    loopStartRef.current = loopStartMeasure;
    loopEndRef.current = loopEndMeasure;
    tracksHistoryRef.current = tracksHistory;
    tracksRedoHistoryRef.current = tracksRedoHistory;
    songStructureHistoryRef.current = songStructureHistory;
    songStructureRedoHistoryRef.current = songStructureRedoHistory;
  }, [
    tracks,
    totalMeasures,
    measureTimeSigs,
    measureBpms,
    measureBpmTransitions,
    measureVols,
    measureVolTransitions,
    songSections,
    measureSignals,
    loopStartMeasure,
    loopEndMeasure,
    tracksHistory,
    tracksRedoHistory,
    songStructureHistory,
    songStructureRedoHistory
  ]);

  // Adjust measure arrays length when totalMeasures changes
  useEffect(() => {
    setMeasureTimeSigs(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(timeSig);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpms(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(bpm);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureBpmTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVols(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(100);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureVolTransitions(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push('immediate');
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });

    setMeasureSignals(prev => {
      const arr = [...prev];
      if (arr.length === totalMeasures) return prev;
      while (arr.length < totalMeasures) {
        arr.push(null);
      }
      if (arr.length > totalMeasures) {
        arr.length = totalMeasures;
      }
      return arr;
    });
  }, [totalMeasures, timeSig, bpm]);

  const pushUndoState = (customTracksState?: TrackGroup[]) => {
    // Clear redo history when a new action is performed
    setTracksRedoHistory([]);
    setSongStructureRedoHistory([]);

    const stateToSave = customTracksState ? customTracksState : tracksRef.current;
    setTracksHistory(prev => {
      const cloned = JSON.parse(JSON.stringify(stateToSave));
      const next = [...prev, cloned];
      if (next.length > 50) next.shift();
      return next;
    });

    setSongStructureHistory(prev => {
      const cloned = {
        measureTimeSigs: [...measureTimeSigsRef.current],
        measureBpms: [...measureBpmsRef.current],
        measureBpmTransitions: [...measureBpmTransitionsRef.current],
        measureVols: [...measureVolsRef.current],
        measureVolTransitions: [...measureVolTransitionsRef.current],
        songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
      };
      const next = [...prev, cloned];
      if (next.length > 50) next.shift();
      return next;
    });
  };

  const handleUndo = () => {
    if (tracksHistoryRef.current.length === 0) return;

    // Enregistrer l'état actuel dans l'historique de redo
    const currentTracksCloned = JSON.parse(JSON.stringify(tracksRef.current));
    setTracksRedoHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureRedoHistory(prev => [...prev, currentStructureCloned]);

    setTracksHistory(prev => {
      const nextHistory = [...prev];
      const previousState = nextHistory.pop();
      if (previousState) {
        setTracks(previousState);
      }
      return nextHistory;
    });

    if (songStructureHistoryRef.current.length > 0) {
      setSongStructureHistory(prev => {
        const nextHistory = [...prev];
        const previousState = nextHistory.pop();
        if (previousState) {
          setMeasureTimeSigs(previousState.measureTimeSigs);
          setMeasureBpms(previousState.measureBpms);
          setMeasureBpmTransitions(previousState.measureBpmTransitions);
          if (previousState.measureVols) setMeasureVols(previousState.measureVols);
          if (previousState.measureVolTransitions) setMeasureVolTransitions(previousState.measureVolTransitions);
          if (previousState.songSections) setSongSections(previousState.songSections);
        }
        return nextHistory;
      });
    }
  };

  const handleRedo = () => {
    if (tracksRedoHistoryRef.current.length === 0) return;

    // Enregistrer l'état actuel dans l'historique d'undo
    const currentTracksCloned = JSON.parse(JSON.stringify(tracksRef.current));
    setTracksHistory(prev => [...prev, currentTracksCloned]);

    const currentStructureCloned = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: JSON.parse(JSON.stringify(songSectionsRef.current))
    };
    setSongStructureHistory(prev => [...prev, currentStructureCloned]);

    setTracksRedoHistory(prev => {
      const nextHistory = [...prev];
      const nextState = nextHistory.pop();
      if (nextState) {
        setTracks(nextState);
      }
      return nextHistory;
    });

    if (songStructureRedoHistoryRef.current.length > 0) {
      setSongStructureRedoHistory(prev => {
        const nextHistory = [...prev];
        const nextState = nextHistory.pop();
        if (nextState) {
          setMeasureTimeSigs(nextState.measureTimeSigs);
          setMeasureBpms(nextState.measureBpms);
          setMeasureBpmTransitions(nextState.measureBpmTransitions);
          if (nextState.measureVols) setMeasureVols(nextState.measureVols);
          if (nextState.measureVolTransitions) setMeasureVolTransitions(nextState.measureVolTransitions);
          if (nextState.songSections) setSongSections(nextState.songSections);
        }
        return nextHistory;
      });
    }
  };

  const clearHistory = () => {
    setTracksHistory([]);
    setTracksRedoHistory([]);
    setSongStructureHistory([]);
    setSongStructureRedoHistory([]);
  };

  return {
    // States & Setters
    tracks, setTracks, tracksRef,
    bpm, setBpm,
    totalMeasures, setTotalMeasures, totalMeasuresRef,
    timeSig, setTimeSig,
    measureTimeSigs, setMeasureTimeSigs, measureTimeSigsRef,
    measureBpms, setMeasureBpms, measureBpmsRef,
    measureBpmTransitions, setMeasureBpmTransitions, measureBpmTransitionsRef,
    measureVols, setMeasureVols, measureVolsRef,
    measureVolTransitions, setMeasureVolTransitions, measureVolTransitionsRef,
    songSections, setSongSections, songSectionsRef,
    measureSignals, setMeasureSignals, measureSignalsRef,
    loopStartMeasure, setLoopStartMeasure, loopStartRef,
    loopEndMeasure, setLoopEndMeasure, loopEndRef,
    // History
    tracksHistory,
    tracksRedoHistory,
    pushUndoState,
    handleUndo,
    handleRedo,
    clearHistory
  };
}
