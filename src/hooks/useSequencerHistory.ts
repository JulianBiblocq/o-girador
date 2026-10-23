/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { TrackGroup } from '../types';
import { useSequencerStore } from '../stores/useSequencerStore';
import { StructureSnapshot, UseSequencerHistoryOptions } from './useSequencerHistoryTypes';

export type { StructureSnapshot, UseSequencerHistoryOptions };


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

  // Synchronisation avec le store Zustand pour Header.tsx (canUndo / canRedo) et raccourcis globaux
  const syncStoreHistory = (
    history: TrackGroup[][],
    redoHistory: TrackGroup[][],
    structHistory?: StructureSnapshot[],
    structRedo?: StructureSnapshot[]
  ) => {
    useSequencerStore.setState({
      tracksHistory: history,
      tracksRedoHistory: redoHistory,
      ...(structHistory ? { songStructureHistory: structHistory as any } : {}),
      ...(structRedo ? { songStructureRedoHistory: structRedo as any } : {}),
    });
  };

  const pushUndoState = (customTracksState?: TrackGroup[]) => {
    useSequencerStore.getState().pushUndoState(customTracksState);
  };

  const handleUndo = () => {
    useSequencerStore.getState().handleUndo();
    const store = useSequencerStore.getState();
    setTracks(store.tracks);
    setMeasureBpms(store.measureBpms);
    setMeasureBpmTransitions(store.measureBpmTransitions);
    setMeasureVols(store.measureVols);
    setMeasureVolTransitions(store.measureVolTransitions);
    setMeasureTimeSigs(store.measureTimeSigs);
    if (store.songSections) setSongSections(store.songSections);
    if (store.songMarkers) setSongMarkers(store.songMarkers);
  };

  const handleRedo = () => {
    useSequencerStore.getState().handleRedo();
    const store = useSequencerStore.getState();
    setTracks(store.tracks);
    setMeasureBpms(store.measureBpms);
    setMeasureBpmTransitions(store.measureBpmTransitions);
    setMeasureVols(store.measureVols);
    setMeasureVolTransitions(store.measureVolTransitions);
    setMeasureTimeSigs(store.measureTimeSigs);
    if (store.songSections) setSongSections(store.songSections);
    if (store.songMarkers) setSongMarkers(store.songMarkers);
  };

  const clearHistory = () => {
    setTracksHistory([]);
    setTracksRedoHistory([]);
    setSongStructureHistory([]);
    setSongStructureRedoHistory([]);
    syncStoreHistory([], [], [], []);
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
