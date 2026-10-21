import React, { useState, useCallback, useEffect } from 'react';
import { PresetMetadata, Language } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useSequencerStore } from '../stores/useSequencerStore';
import { useSequencerHistory } from './useSequencerHistory';
import { audioEngine } from './useAudioSync';
import { useSequencerMeasuresState } from './sequencer-state/useSequencerMeasuresState';
import { useSequencerStateRefs } from './sequencer-state/useSequencerStateRefs';
import { useMeasureSyncEffects } from './sequencer-state/useMeasureSyncEffects';
import { useAsyncDialog } from './sequencer-state/asyncDialogHelpers';
import { createTrackManagementHandlers } from './sequencer-state/trackManagementHandlers';
import { createTrackVariationSculptHandlers } from './sequencer-state/trackVariationSculptHandlers';
import { createVariationStepSculptHandlers } from './sequencer-state/variationStepSculptHandlers';
import { createMeasureSectionHandlers } from './sequencer-state/measureSectionHandlers';
import { createMeasureInsertDeleteHandlers } from './sequencer-state/measureInsertDeleteHandlers';
import { createLoopHandlers } from './sequencer-state/loopHandlers';
import { createPatternVoiceStepHandlers } from './sequencer-state/patternVoiceStepHandlers';
import { createPatternVoicePreRollHandlers } from './sequencer-state/patternVoicePreRollHandlers';
import { createPatternStepHandlers } from './sequencer-state/patternStepHandlers';
import { createClipboardHandlers } from './sequencer-state/clipboardHandlers';
import { handleAddTrackInstrumentHelper } from './sequencer-state/trackAddInstrumentHelper';
import { getSequencerStoreDelegates } from './sequencer-state/sequencerStoreDelegates';

export { useAsyncDialog };

export function useSequencerState() {
  const { userProfile, updateUserPreference } = useAuth();
  const m = useSequencerMeasuresState();
  const letras = useSequencerStore(state => state.letras);
  const setLetras = useCallback((val: string | ((prev: string) => string)) => {
    useSequencerStore.getState().setLetras(typeof val === 'function' ? val(useSequencerStore.getState().letras ?? '') : val);
  }, []);
  const metadata = useSequencerStore(state => state.metadata);
  const setMetadata = useCallback((val: PresetMetadata | ((prev: PresetMetadata) => PresetMetadata)) => {
    const cur = useSequencerStore.getState().metadata || { toada: '', nacao: '', compositor: '', ritmo: '', rhythmSignals: [] };
    useSequencerStore.getState().setMetadata(typeof val === 'function' ? val(cur) : val);
  }, []);

  const [isLeftHanded, _setIsLeftHanded] = useState<boolean>(() => localStorage.getItem('o_girador_left_handed') === 'true');
  const [lang, _setLang] = useState<Language>(() => (localStorage.getItem('o_girador_lang') === 'fr' ? 'fr' : 'pt'));

  const setLang = useCallback((newLang: Language) => {
    _setLang(newLang);
    if (typeof window !== 'undefined') localStorage.setItem('o_girador_lang', newLang);
    useSequencerStore.getState().setLang(newLang);
  }, []);

  useEffect(() => useSequencerStore.subscribe((s) => {
    if (s.lang && s.lang !== lang) _setLang(s.lang);
  }), [lang]);
  useEffect(() => { useSequencerStore.setState({ bpm: m.bpm, timeSig: m.timeSig, isLooping: m.isLooping }); }, [m.bpm, m.timeSig, m.isLooping]);
  useEffect(() => {
    if (userProfile?.isLeftHanded !== undefined) {
      _setIsLeftHanded(userProfile.isLeftHanded);
      localStorage.setItem('o_girador_left_handed', String(userProfile.isLeftHanded));
    }
  }, [userProfile?.isLeftHanded]);

  const setIsLeftHanded = (val: boolean) => {
    _setIsLeftHanded(val);
    localStorage.setItem('o_girador_left_handed', String(val));
    if (userProfile) updateUserPreference('isLeftHanded', val);
  };

  const refs = useSequencerStateRefs();
  const history = useSequencerHistory({
    tracksRef: refs.tracksRef, measureTimeSigsRef: refs.measureTimeSigsRef, measureBpmsRef: refs.measureBpmsRef,
    measureBpmTransitionsRef: refs.measureBpmTransitionsRef, measureVolsRef: refs.measureVolsRef,
    measureVolTransitionsRef: refs.measureVolTransitionsRef, songSectionsRef: refs.songSectionsRef,
    songMarkersRef: refs.songMarkersRef, setTracks: m.setTracks, setMeasureTimeSigs: m.setMeasureTimeSigs,
    setSongSections: m.setSongSections, setSongMarkers: m.setSongMarkers, setMeasureBpms: m.setMeasureBpms,
    setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols, setMeasureVolTransitions: m.setMeasureVolTransitions
  });

  useMeasureSyncEffects({
    totalMeasuresRef: refs.totalMeasuresRef, timeSig: m.timeSig, bpm: m.bpm, totalMeasures: m.totalMeasures,
    songSections: m.songSections, measureSignals: m.measureSignals, lastExpandedRef: refs.lastExpandedRef,
    pendingStructureActionRef: refs.pendingStructureActionRef, setMeasureTimeSigs: m.setMeasureTimeSigs,
    setMeasureBpms: m.setMeasureBpms, setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols,
    setMeasureVolTransitions: m.setMeasureVolTransitions, setMeasureSignals: m.setMeasureSignals
  });

  const dialog = useAsyncDialog();
  const trackMgmt = createTrackManagementHandlers({
    pushUndoState: history.pushUndoState, setTracks: m.setTracks, timeSig: m.timeSig, setLetras, setBpm: m.setBpm, setTimeSig: m.setTimeSig,
    setTotalMeasures: m.setTotalMeasures, setMeasureTimeSigs: m.setMeasureTimeSigs, setMeasureBpms: m.setMeasureBpms,
    setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols, setMeasureVolTransitions: m.setMeasureVolTransitions,
    setMeasureSignals: m.setMeasureSignals, setSongSections: m.setSongSections, setSongMarkers: m.setSongMarkers,
    setActiveAoVivoTrackId: useSequencerStore.getState().setActiveAoVivoTrackId, setMetadata
  });

  const trackSculpt = createTrackVariationSculptHandlers({ pushUndoState: history.pushUndoState, setTracks: m.setTracks });
  const varStepSculpt = createVariationStepSculptHandlers({ pushUndoState: history.pushUndoState, setTracks: m.setTracks });
  const measureSection = createMeasureSectionHandlers({
    pushUndoState: history.pushUndoState, totalMeasures: m.totalMeasures, totalMeasuresRef: refs.totalMeasuresRef,
    measureBpmsRef: refs.measureBpmsRef, measureBpmTransitionsRef: refs.measureBpmTransitionsRef,
    measureVolsRef: refs.measureVolsRef, setTotalMeasures: m.setTotalMeasures, setMeasureTimeSigs: m.setMeasureTimeSigs,
    setMeasureBpms: m.setMeasureBpms, setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols,
    setMeasureVolTransitions: m.setMeasureVolTransitions, setSongSections: m.setSongSections, setTracks: m.setTracks
  });

  const loops = createLoopHandlers({
    pushUndoState: history.pushUndoState, loopStartRef: refs.loopStartRef, loopEndRef: refs.loopEndRef,
    setLoopStartMeasure: m.setLoopStartMeasure, setLoopEndMeasure: m.setLoopEndMeasure, setIsLoopRegionActive: m.setIsLoopRegionActive
  });

  const measureInsertDelete = createMeasureInsertDeleteHandlers({
    pushUndoState: history.pushUndoState, timeSig: m.timeSig, bpm: m.bpm, totalMeasuresRef: refs.totalMeasuresRef,
    measureTimeSigsRef: refs.measureTimeSigsRef, measureBpms: m.measureBpms, measureVols: m.measureVols,
    pendingStructureActionRef: refs.pendingStructureActionRef, setTotalMeasures: m.setTotalMeasures, setMeasureTimeSigs: m.setMeasureTimeSigs,
    setMeasureBpms: m.setMeasureBpms, setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols,
    setMeasureVolTransitions: m.setMeasureVolTransitions, setMeasureSignals: m.setMeasureSignals, setSongMarkers: m.setSongMarkers,
    setSongSections: m.setSongSections, setLoopStartMeasure: m.setLoopStartMeasure, setLoopEndMeasure: m.setLoopEndMeasure, setTracks: m.setTracks
  });

  const voiceSteps = createPatternVoiceStepHandlers({ pushUndoState: history.pushUndoState, setTracks: m.setTracks, setLetras });
  const voicePreRoll = createPatternVoicePreRollHandlers({ pushUndoState: history.pushUndoState, setTracks: m.setTracks });
  const patternSteps = createPatternStepHandlers({ pushUndoState: history.pushUndoState, setTracks: m.setTracks });
  const clipboard = createClipboardHandlers({
    pushUndoState: history.pushUndoState, setTotalMeasures: m.setTotalMeasures, setMeasureTimeSigs: m.setMeasureTimeSigs,
    setMeasureBpms: m.setMeasureBpms, setMeasureBpmTransitions: m.setMeasureBpmTransitions, setMeasureVols: m.setMeasureVols,
    setMeasureVolTransitions: m.setMeasureVolTransitions, setMeasureSignals: m.setMeasureSignals, setSongSections: m.setSongSections,
    setSongMarkers: m.setSongMarkers, setLoopStartMeasure: m.setLoopStartMeasure, setLoopEndMeasure: m.setLoopEndMeasure, setTracks: m.setTracks,
    lang, totalMeasuresRef: refs.totalMeasuresRef, setCopiedPattern: (useSequencerStore as any).getState().setCopiedPattern,
    setCopiedSection: (useSequencerStore as any).getState().setCopiedSection, handleCreateSongSection: measureSection.handleCreateSongSection
  });

  const handleAddTrack = (instIdx: number, currM: number = 0) => handleAddTrackInstrumentHelper(instIdx, {
    pushUndoState: history.pushUndoState, audioEngine, lang, totalMeasuresRef: refs.totalMeasuresRef, currentMeasure: currM, setTracks: m.setTracks
  });

  const handleGlobalBpm = useCallback((val: number | ((prev: number) => number)) => {
    const store = useSequencerStore.getState();
    const cur = (store.measureBpms && store.measureBpms[store.currentMeasure]) ? store.measureBpms[store.currentMeasure] : store.bpm;
    const target = typeof val === 'function' ? val(cur) : val;
    store.setGlobalBpm(target);
    m.setBpm(target);
  }, [m]);

  return {
    ...m, setBpm: handleGlobalBpm, setBpmRaw: m.setBpm, letras, setLetras, metadata, setMetadata, isLeftHanded, setIsLeftHanded, lang, setLang,
    confirmAsync: dialog.confirmAsync, alertAsync: dialog.alertAsync,
    ...getSequencerStoreDelegates(), ...refs, ...history, ...trackMgmt, ...trackSculpt,
    ...varStepSculpt, ...measureSection, ...loops, ...measureInsertDelete, ...voiceSteps,
    ...voicePreRoll, ...patternSteps, ...clipboard, handleAddTrackInstrument: handleAddTrack,
  };
}
