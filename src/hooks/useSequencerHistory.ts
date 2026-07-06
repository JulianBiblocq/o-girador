/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TrackGroup, TimeSignature, SongSection, SongMarker } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';

export interface StructureSnapshot {
  measureTimeSigs: TimeSignature[];
  measureBpms: number[];
  measureBpmTransitions: ('immediate' | 'ramp')[];
  measureVols: number[];
  measureVolTransitions: ('immediate' | 'ramp')[];
  songSections?: SongSection[];
  songMarkers?: SongMarker[];
}

export interface UseSequencerHistoryOptions {
  tracksRef: React.MutableRefObject<TrackGroup[]>;
  measureTimeSigsRef: React.MutableRefObject<TimeSignature[]>;
  measureBpmsRef: React.MutableRefObject<number[]>;
  measureBpmTransitionsRef: React.MutableRefObject<('immediate' | 'ramp')[]>;
  measureVolsRef: React.MutableRefObject<number[]>;
  measureVolTransitionsRef: React.MutableRefObject<('immediate' | 'ramp')[]>;
  songSectionsRef: React.MutableRefObject<SongSection[]>;
  songMarkersRef: React.MutableRefObject<SongMarker[]>;

  setTracks: (tracks: TrackGroup[]) => void;
  setMeasureTimeSigs: (sigs: TimeSignature[]) => void;
  setSongSections: (sections: SongSection[]) => void;
  setSongMarkers: (markers: SongMarker[]) => void;
  setMeasureBpms: React.Dispatch<React.SetStateAction<number[]>>;
  setMeasureBpmTransitions: React.Dispatch<React.SetStateAction<('immediate' | 'ramp')[]>>;
  setMeasureVols: React.Dispatch<React.SetStateAction<number[]>>;
  setMeasureVolTransitions: React.Dispatch<React.SetStateAction<('immediate' | 'ramp')[]>>;
}

export function useSequencerHistory({
  tracksRef,
  measureTimeSigsRef,
  measureBpmsRef,
  measureBpmTransitionsRef,
  measureVolsRef,
  measureVolTransitionsRef,
  songSectionsRef,
  songMarkersRef,
  setTracks,
  setMeasureTimeSigs,
  setSongSections,
  setSongMarkers,
  setMeasureBpms,
  setMeasureBpmTransitions,
  setMeasureVols,
  setMeasureVolTransitions,
}: UseSequencerHistoryOptions) {
  // États locaux
  const [tracksHistory, setTracksHistory] = useState<TrackGroup[][]>([]);
  const [tracksRedoHistory, setTracksRedoHistory] = useState<TrackGroup[][]>([]);

  const [songStructureHistory, setSongStructureHistory] = useState<StructureSnapshot[]>([]);
  const [songStructureRedoHistory, setSongStructureRedoHistory] = useState<StructureSnapshot[]>([]);

  // Refs de l'historique pour l'accès synchrone
  const tracksHistoryRef = useRef<TrackGroup[][]>([]);
  const tracksRedoHistoryRef = useRef<TrackGroup[][]>([]);
  const songStructureHistoryRef = useRef<StructureSnapshot[]>([]);
  const songStructureRedoHistoryRef = useRef<StructureSnapshot[]>([]);

  useEffect(() => {
    tracksHistoryRef.current = tracksHistory;
    tracksRedoHistoryRef.current = tracksRedoHistory;
    songStructureHistoryRef.current = songStructureHistory;
    songStructureRedoHistoryRef.current = songStructureRedoHistory;
  }, [tracksHistory, tracksRedoHistory, songStructureHistory, songStructureRedoHistory]);

  // Synchronisation avec le store Zustand pour Header.tsx (canUndo / canRedo)
  const syncStoreHistory = (history: TrackGroup[][], redoHistory: TrackGroup[][]) => {
    useSequencerStore.setState({
      tracksHistory: history,
      tracksRedoHistory: redoHistory,
    });
  };

  const pushUndoState = (customTracksState?: TrackGroup[]) => {
    // 1. Snapshot SYNCHRONE (Vital : il faut capturer l'état *maintenant*)
    const stateToSave = customTracksState ? customTracksState : tracksRef.current;
    const clonedStructure: StructureSnapshot = {
      measureTimeSigs: [...measureTimeSigsRef.current],
      measureBpms: [...measureBpmsRef.current],
      measureBpmTransitions: [...measureBpmTransitionsRef.current],
      measureVols: [...measureVolsRef.current],
      measureVolTransitions: [...measureVolTransitionsRef.current],
      songSections: [...songSectionsRef.current],
      songMarkers: [...(songMarkersRef.current || [])],
    };
    
    // 2. Mise à jour DIFFÉRÉE (On libère le thread immédiatement)
    const deferredSave = () => {
      const nextTracksHistory = [...tracksHistoryRef.current, stateToSave].slice(-10);
      setTracksHistory(nextTracksHistory);
      setTracksRedoHistory([]);

      const nextStructureHistory = [...songStructureHistoryRef.current, clonedStructure].slice(-10);
      setSongStructureHistory(nextStructureHistory);
      setSongStructureRedoHistory([]);

      syncStoreHistory(nextTracksHistory, []);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(deferredSave);
    } else {
      setTimeout(deferredSave, 0);
    }
  };

  const handleUndo = () => {
    if (tracksHistoryRef.current.length === 0) return;

    const currentTracks = tracksRef.current;
    const currentStructure: StructureSnapshot = {
      measureTimeSigs: measureTimeSigsRef.current,
      measureBpms: measureBpmsRef.current,
      measureBpmTransitions: measureBpmTransitionsRef.current,
      measureVols: measureVolsRef.current,
      measureVolTransitions: measureVolTransitionsRef.current,
      songSections: songSectionsRef.current,
      songMarkers: songMarkersRef.current,
    };

    const nextTracksRedoHistory = [...tracksRedoHistoryRef.current, currentTracks];
    const nextSongStructureRedoHistory = [...songStructureRedoHistoryRef.current, currentStructure];

    setTracksRedoHistory(nextTracksRedoHistory);
    setSongStructureRedoHistory(nextSongStructureRedoHistory);

    const nextTracksHistory = [...tracksHistoryRef.current];
    const previousTracksState = nextTracksHistory.pop();
    if (previousTracksState) {
      setTracks(previousTracksState);
    }
    setTracksHistory(nextTracksHistory);

    if (songStructureHistoryRef.current.length > 0) {
      const nextStructureHistory = [...songStructureHistoryRef.current];
      const previousStructureState = nextStructureHistory.pop();
      if (previousStructureState) {
        setMeasureTimeSigs(previousStructureState.measureTimeSigs);
        setMeasureBpms(previousStructureState.measureBpms);
        setMeasureBpmTransitions(previousStructureState.measureBpmTransitions);
        setMeasureVols(previousStructureState.measureVols);
        setMeasureVolTransitions(previousStructureState.measureVolTransitions);
        if (previousStructureState.songSections) setSongSections(previousStructureState.songSections);
        if (previousStructureState.songMarkers) setSongMarkers(previousStructureState.songMarkers);
      }
      setSongStructureHistory(nextStructureHistory);
    }

    syncStoreHistory(nextTracksHistory, nextTracksRedoHistory);
  };

  const handleRedo = () => {
    if (tracksRedoHistoryRef.current.length === 0) return;

    const currentTracks = tracksRef.current;
    const currentStructure: StructureSnapshot = {
      measureTimeSigs: measureTimeSigsRef.current,
      measureBpms: measureBpmsRef.current,
      measureBpmTransitions: measureBpmTransitionsRef.current,
      measureVols: measureVolsRef.current,
      measureVolTransitions: measureVolTransitionsRef.current,
      songSections: songSectionsRef.current,
      songMarkers: songMarkersRef.current,
    };

    const nextTracksHistory = [...tracksHistoryRef.current, currentTracks];
    const nextSongStructureHistory = [...songStructureHistoryRef.current, currentStructure];

    setTracksHistory(nextTracksHistory);
    setSongStructureHistory(nextSongStructureHistory);

    const nextTracksRedoHistory = [...tracksRedoHistoryRef.current];
    const nextTracksState = nextTracksRedoHistory.pop();
    if (nextTracksState) {
      setTracks(nextTracksState);
    }
    setTracksRedoHistory(nextTracksRedoHistory);

    if (songStructureRedoHistoryRef.current.length > 0) {
      const nextSongStructureRedoHistory = [...songStructureRedoHistoryRef.current];
      const nextStructureState = nextSongStructureRedoHistory.pop();
      if (nextStructureState) {
        setMeasureTimeSigs(nextStructureState.measureTimeSigs);
        setMeasureBpms(nextStructureState.measureBpms);
        setMeasureBpmTransitions(nextStructureState.measureBpmTransitions);
        setMeasureVols(nextStructureState.measureVols);
        setMeasureVolTransitions(nextStructureState.measureVolTransitions);
        if (nextStructureState.songSections) setSongSections(nextStructureState.songSections);
        if (nextStructureState.songMarkers) setSongMarkers(nextStructureState.songMarkers);
      }
      setSongStructureRedoHistory(nextSongStructureRedoHistory);
    }

    syncStoreHistory(nextTracksHistory, nextTracksRedoHistory);
  };

  const clearHistory = () => {
    setTracksHistory([]);
    setTracksRedoHistory([]);
    setSongStructureHistory([]);
    setSongStructureRedoHistory([]);
    syncStoreHistory([], []);
  };

  return {
    tracksHistory,
    tracksRedoHistory,
    pushUndoState,
    handleUndo,
    handleRedo,
    clearHistory,
  };
}
