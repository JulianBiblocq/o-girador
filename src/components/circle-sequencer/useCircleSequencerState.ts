/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useEffect, useMemo } from 'react';
import { isSequencerVisibleTrack } from '../../stores/useSequencerStore';
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
import { useCircleSequencerStoreData } from './useCircleSequencerStoreData';
import { CircleSequencerProps, LivePlaybackState } from './circleSequencerTypes';

const EMPTY_LIST: any[] = [];

export function useCircleSequencerState(props: CircleSequencerProps) {
  const { isActive = true } = props;
  const sequencer = useSequencer();
  const audio = useAudio();
  const storeData = useCircleSequencerStoreData(isActive);

  const lang = props.lang ?? sequencer.lang;
  const isLeftHanded = props.isLeftHanded ?? sequencer.isLeftHanded;
  const tracksFromStore = useTracksWithCustomEquality(isActive);
  const rawTracks = props.tracks ?? tracksFromStore;
  let tracks = rawTracks.filter(t => isSequencerVisibleTrack(t, rawTracks));
  if (props.visibleTrackIds && props.visibleTrackIds.length > 0) {
    const allowed = new Set(props.visibleTrackIds.map(String));
    tracks = tracks.filter(t => allowed.has(String(t.id)));
  }

  const totalMeasures = props.totalMeasures ?? storeData.totalMeasures;
  const songSections = props.songSections ?? (storeData.songSections ?? EMPTY_LIST);
  const songMarkers = props.songMarkers ?? (storeData.songMarkers ?? EMPTY_LIST);
  const rodaTrackOrder = props.rodaTrackOrder ?? storeData.rodaTrackOrder;
  const isLoopRegionActive = storeData.isLoopRegionActive;
  const loopStartMeasure = storeData.loopStartMeasure;
  const loopEndMeasure = storeData.loopEndMeasure;
  const currentMeasure = props.currentMeasure ?? storeData.currentMeasure;
  const measureTimeSigs = storeData.measureTimeSigs;
  const isMetroOn = props.isMetroOn ?? storeData.isMetroOn;
  const soloPatternPlayId = props.soloPatternPlayId ?? storeData.soloPatternPlayId;
  const isLetraActive = props.isLetraActive ?? storeData.isLetraActive;
  const toggleLetraActive = storeData.toggleLetraActive;
  const { vocalMode, setVocalMode } = storeData;

  const bpm = props.bpm ?? sequencer.bpm;
  const measureBpms = props.measureBpms ?? sequencer.measureBpms;
  const measureVols = props.measureVols ?? sequencer.measureVols;
  const measureSignals = props.measureSignals ?? (sequencer.measureSignals ?? EMPTY_LIST);
  const isPlaying = props.isPlaying ?? audio.isPlaying;
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
