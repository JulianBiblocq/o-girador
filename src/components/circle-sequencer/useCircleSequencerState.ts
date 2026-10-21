/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useMemo } from 'react';
import { useSequencerStore, isSequencerVisibleTrack } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudioStore } from '../../stores/useAudioStore';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { useTracksWithCustomEquality } from './measurePatternHelpers';
import { createOverlayUpdater } from './useCircleOverlay';
import { useCircleTickSync } from './useCircleTickSync';
import { useCircleTouchInteraction } from './useCircleTouchInteraction';
import { useCirclePlayheadRaf } from './useCirclePlayheadRaf';
import { resolveLiveActivePatternId } from './resolveLiveActivePatternId';
import { useRodaMeasureNavigationState } from './useRodaMeasureNavigationState';
import { useApitoShake } from './useApitoShake';
import { useOverlayRefs } from './useOverlayRefs';
import { CircleSequencerProps, LivePlaybackState, OverlayCacheState } from './circleSequencerTypes';


export function useCircleSequencerState(props: CircleSequencerProps) {
  const { isActive = true } = props;
  const sequencer = useSequencer();
  const audio = useAudio();

  const lang = props.lang ?? sequencer.lang;
  const isLeftHanded = props.isLeftHanded ?? sequencer.isLeftHanded;
  const tracksFromStore = useTracksWithCustomEquality(isActive);
  const rawTracks = props.tracks ?? tracksFromStore;
  let tracks = rawTracks.filter(t => isSequencerVisibleTrack(t, rawTracks));
  if (props.visibleTrackIds && props.visibleTrackIds.length > 0) {
    const allowed = new Set(props.visibleTrackIds.map(String));
    tracks = tracks.filter(t => allowed.has(String(t.id)));
  }
  const totalMeasures = props.totalMeasures ?? useSequencerStore(state => state.totalMeasures);
  const bpm = props.bpm ?? sequencer.bpm;
  const measureBpms = props.measureBpms ?? sequencer.measureBpms;
  const measureVols = props.measureVols ?? sequencer.measureVols;
  const measureSignals = props.measureSignals ?? (sequencer.measureSignals || []);
  const songSections = props.songSections ?? (useSequencerStore(state => state.songSections) || []);
  const songMarkers = props.songMarkers ?? (useSequencerStore(state => state.songMarkers) || []);
  const rodaTrackOrder = props.rodaTrackOrder ?? useSequencerStore(state => state.rodaTrackOrder);
  const isLoopRegionActive = useSequencerStore(state => state.isLoopRegionActive);
  const loopStartMeasure = useSequencerStore(state => state.loopStartMeasure);
  const loopEndMeasure = useSequencerStore(state => state.loopEndMeasure);

  const isPlaying = props.isPlaying ?? audio.isPlaying;
  const currentMeasure = props.currentMeasure ?? useSequencerStore(state => (isActive ? state.currentMeasure : 0));
  const measureTimeSigs = useSequencerStore(state => state.measureTimeSigs);
  const isMetroOn = props.isMetroOn ?? useTransportStore(state => state.isMetroOn);
  const soloPatternPlayId = props.soloPatternPlayId ?? useTransportStore(state => state.soloPatternPlayId);
  const hitTriggersRef = props.hitTriggersRef ?? audio.hitTriggersRef;

  const metadata = sequencer.metadata;
  const rhythmSignals = props.rhythmSignals ?? (metadata?.rhythmSignals || []);
  const mestreSignals = props.mestreSignals ?? [];
  const maxTicks = props.maxTicks ?? audio.maxTicksRef.current;
  const timeSig = props.timeSig ?? (measureTimeSigs?.[currentMeasure] || sequencer.timeSig || '4/4');

  const onTogglePlay = props.onTogglePlay ?? audio.handleTogglePlay;
  const onNavigateMeasure = props.onNavigateMeasure ?? ((mIdx: number) => audio.handleTimelineNavigate(mIdx, 0, 16));
  const onStepChange = props.onStepChange ?? sequencer.handleStepValueSelectAndToggle;

  const {
    canvasRef, measureDisplayRef, centerOverlayRef, centerAfficheurRef, centerOverlayImgRef,
    centerOverlayTintRef, centerOverlayTextRef, lastOverlayTextRef, frozenStickAngleRef, lastOverlayStateRef,
  } = useOverlayRefs();


  const isCenterShaking = useApitoShake();
  const storeLetraActive = useSequencerStore(state => state.isLetraActive);
  const isLetraActive = props.isLetraActive ?? storeLetraActive;
  const toggleLetraActive = useSequencerStore(state => state.toggleLetraActive);
  const vocalMode = useAudioStore(state => state.vocalMode);
  const setVocalMode = useAudioStore(state => state.setVocalMode);

  const {
    pendingTargetMeasure, setPendingTargetMeasure, pendingTargetMeasureRef,
    pendingTargetExpandedIndex, setPendingTargetExpandedIndex, pendingTargetExpandedIndexRef
  } = useRodaMeasureNavigationState(currentMeasure);

  const expandedRef = useRef<any[]>([]);
  useEffect(() => { expandedRef.current = getExpandedMeasures(totalMeasures, songSections); }, [totalMeasures, songSections]);

  const livePlaybackRef = useRef<LivePlaybackState>({
    step: -1, measure: 0, maxTicks: 96, ratio: 0, iteration: 1, time: 0, isPreRoll: false,
  });

  const stateRef = useRef<any>({});
  stateRef.current = {
    tracks, rawTracks, rodaTrackOrder, isPlaying, currentMeasure, maxTicks, timeSig, lang, isMetroOn,
    totalMeasures, isLoopRegionActive, loopStartMeasure, loopEndMeasure, hitTriggersRef, bpm,
    measureBpms, measureVols, isMobile: props.isMobile ?? false, soloPatternPlayId, measureSignals,
    rhythmSignals, mestreSignals, songSections, isLeftHanded, songMarkers, measureTimeSigs, isLetraActive, vocalMode,
  };

  const updateOverlay = createOverlayUpdater(
    centerOverlayRef, centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef,
    centerOverlayTextRef, lastOverlayStateRef, lastOverlayTextRef, stateRef
  );

  useCircleTickSync(
    isActive, totalMeasures, songSections, expandedRef, livePlaybackRef, frozenStickAngleRef,
    measureDisplayRef, pendingTargetExpandedIndexRef, measureTimeSigs, timeSig, lang, updateOverlay
  );

  const getLiveActivePatternId = (t: any) => resolveLiveActivePatternId(t, livePlaybackRef, stateRef);

  const { handleCanvasPointerDown, handleCanvasPointerMove } = useCircleTouchInteraction(
    canvasRef, stateRef, getLiveActivePatternId, onTogglePlay, onStepChange, props.onStepTouchStart,
    props.langPromptVoiceText, audio.isLoading
  );

  useCirclePlayheadRaf(
    canvasRef, isActive, stateRef, livePlaybackRef, frozenStickAngleRef, pendingTargetMeasureRef,
    getLiveActivePatternId, sequencer.activeVariationsRef
  );

  const activeBpm = measureBpms?.[currentMeasure] ?? bpm;
  const activeVol = measureVols?.[currentMeasure] ?? 100;
  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
  const activeRepIndex = expanded.findIndex(item => item.baseMeasure === currentMeasure);
  const displayMeasure = pendingTargetExpandedIndex !== null ? pendingTargetExpandedIndex + 1 : (activeRepIndex !== -1 ? activeRepIndex + 1 : currentMeasure + 1);

  return {
    isActive, isPlaying, lang, timeSig, activeBpm, activeVol, totalMeasures, currentMeasure,
    displayMeasure, displayTotal, expandedRef, pendingTargetMeasure, setPendingTargetMeasure,
    pendingTargetMeasureRef, pendingTargetExpandedIndex, setPendingTargetExpandedIndex,
    pendingTargetExpandedIndexRef, canvasRef, measureDisplayRef, centerOverlayRef,
    centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef, centerOverlayTextRef,
    isCenterShaking, isLetraActive, toggleLetraActive, vocalMode, setVocalMode,
    onNavigateMeasure, handleCanvasPointerDown, handleCanvasPointerMove, isMobile: props.isMobile ?? false,
  };
}
