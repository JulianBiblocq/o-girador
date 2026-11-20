import { useRef, useEffect, useMemo, useState } from 'react';
import { useSequencer } from '../../contexts/SequencerContext';
import { useAudio } from '../../contexts/AudioContext';
import { getExpandedMeasures } from '../../utils/measureHelpers';
import { getRodaMeasureGeometry } from '../../utils/rodaTimeSigGeometry';
import { getDefaultStepsForMeasure, useTracksWithCustomEquality } from './measurePatternHelpers';
import { createOverlayUpdater } from './useCircleOverlay';
import { useCircleTickSync } from './useCircleTickSync';
import { useCircleTouchInteraction } from './useCircleTouchInteraction';
import { useCirclePlayheadRaf } from './useCirclePlayheadRaf';
import { resolveLiveActivePatternId } from './resolveLiveActivePatternId';
import { useRodaMeasureNavigationState } from './useRodaMeasureNavigationState';
import { useApitoShake } from './useApitoShake';
import { useOverlayRefs } from './useOverlayRefs';
import { useCircleSequencerStoreData } from './useCircleSequencerStoreData';
import { resolveVisibleRodaTracks } from './resolveVisibleRodaTracks';
import { CircleSequencerProps, LivePlaybackState } from './circleSequencerTypes';
import { StrokeInfoPopoverTarget } from '../pedagogy/strokeInfoTypes';

const EMPTY_LIST: any[] = [];

export function useCircleSequencerState(props: CircleSequencerProps) {
  const { isActive = true } = props;
  const sequencer = useSequencer();
  const audio = useAudio();
  const storeData = useCircleSequencerStoreData(isActive);
  const [pedagogyTarget, setPedagogyTarget] = useState<StrokeInfoPopoverTarget | null>(null);

  const lang = props.lang ?? sequencer.lang;
  const isLeftHanded = props.isLeftHanded ?? sequencer.isLeftHanded;
  const tracksFromStore = useTracksWithCustomEquality(isActive);
  const rawTracks = props.tracks ?? tracksFromStore;
  const tracks = resolveVisibleRodaTracks(rawTracks, props);

  const totalMeasures = props.totalMeasures ?? storeData.totalMeasures;
  const songSections = props.songSections ?? (storeData.songSections ?? EMPTY_LIST);
  const songMarkers = props.songMarkers ?? (storeData.songMarkers ?? EMPTY_LIST);
  const rodaTrackOrder = props.rodaTrackOrder ?? storeData.rodaTrackOrder;
  const { isLoopRegionActive, loopStartMeasure, loopEndMeasure, measureTimeSigs, toggleLetraActive, vocalMode, setVocalMode } = storeData;
  const currentMeasure = props.currentMeasure ?? storeData.currentMeasure;
  const isMetroOn = props.isMetroOn ?? storeData.isMetroOn;
  const soloPatternPlayId = props.soloPatternPlayId ?? storeData.soloPatternPlayId;
  const soloPatternVariationId = storeData.soloPatternVariationId;
  const isLetraActive = props.isLetraActive ?? storeData.isLetraActive;

  const bpm = props.bpm ?? sequencer.bpm;
  const measureBpms = props.measureBpms ?? sequencer.measureBpms;
  const measureVols = props.measureVols ?? sequencer.measureVols;
  const measureSignals = props.measureSignals ?? (sequencer.measureSignals ?? EMPTY_LIST);
  const isPlaying = props.isPlaying ?? audio.isPlaying;
  const hitTriggersRef = props.hitTriggersRef ?? audio.hitTriggersRef;

  const metadata = sequencer.metadata;
  const rhythmSignals = props.rhythmSignals ?? (metadata?.rhythmSignals || []);
  const mestreSignals = props.mestreSignals ?? [];
  const timeSig = props.timeSig ?? (measureTimeSigs?.[currentMeasure] || sequencer.timeSig || '4/4');
  const measureMaxTicks = getRodaMeasureGeometry(timeSig).maxTicks;
  const maxTicks = props.maxTicks ?? measureMaxTicks;

  const onTogglePlay = props.onTogglePlay ?? audio.handleTogglePlay;
  const onNavigateMeasure = props.onNavigateMeasure ?? ((mIdx: number) =>
    audio.handleTimelineNavigate(mIdx, 0, getDefaultStepsForMeasure(mIdx, sequencer.timeSig, measureTimeSigs))
  );

  useEffect(() => { if (!isActive) setPedagogyTarget(null); }, [isActive]);

  const {
    canvasRef, measureDisplayRef, centerOverlayRef, centerAfficheurRef, centerOverlayImgRef,
    centerOverlayTintRef, centerOverlayTextRef, lastOverlayTextRef, frozenStickAngleRef, lastOverlayStateRef,
  } = useOverlayRefs();

  const isCenterShaking = useApitoShake();
  const {
    pendingTargetMeasure, setPendingTargetMeasure, pendingTargetMeasureRef,
    pendingTargetExpandedIndex, setPendingTargetExpandedIndex, pendingTargetExpandedIndexRef,
  } = useRodaMeasureNavigationState(currentMeasure);

  const expandedRef = useRef<any[]>([]);
  useEffect(() => { expandedRef.current = getExpandedMeasures(totalMeasures, songSections); }, [totalMeasures, songSections]);

  const livePlaybackRef = useRef<LivePlaybackState>({
    step: -1, measure: 0, maxTicks: measureMaxTicks, ratio: 0, iteration: 1, time: 0, isPreRoll: false,
  });

  const stateRef = useRef<any>({});
  stateRef.current = {
    tracks, rawTracks, rodaTrackOrder, isPlaying, currentMeasure, maxTicks, timeSig, lang, isMetroOn,
    totalMeasures, isLoopRegionActive, loopStartMeasure, loopEndMeasure, hitTriggersRef, bpm,
    measureBpms, measureVols, isMobile: props.isMobile ?? false, soloPatternPlayId, soloPatternVariationId, measureSignals,
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
  const { handleCanvasPointerDown } = useCircleTouchInteraction(
    canvasRef, stateRef, livePlaybackRef, sequencer.activeVariationsRef, onTogglePlay, setPedagogyTarget, audio.isLoading
  );

  useCirclePlayheadRaf(
    canvasRef, isActive, stateRef, livePlaybackRef, frozenStickAngleRef, pendingTargetMeasureRef,
    getLiveActivePatternId, sequencer.activeVariationsRef
  );

  const activeBpm = measureBpms?.[currentMeasure] ?? bpm, activeVol = measureVols?.[currentMeasure] ?? 100;
  const expanded = useMemo(() => getExpandedMeasures(totalMeasures, songSections), [totalMeasures, songSections]);
  const displayTotal = expanded.length > 0 ? expanded.length : totalMeasures;
  const activeRepIndex = expanded.findIndex((item) => item.baseMeasure === currentMeasure);
  const displayMeasure = pendingTargetExpandedIndex !== null ? pendingTargetExpandedIndex + 1 : (activeRepIndex !== -1 ? activeRepIndex + 1 : currentMeasure + 1);

  return {
    isActive, isPlaying, lang, timeSig, activeBpm, activeVol, totalMeasures, currentMeasure,
    displayMeasure, displayTotal, expandedRef, pendingTargetMeasure, setPendingTargetMeasure,
    pendingTargetMeasureRef, pendingTargetExpandedIndex, setPendingTargetExpandedIndex,
    pendingTargetExpandedIndexRef, canvasRef, measureDisplayRef, centerOverlayRef,
    centerAfficheurRef, centerOverlayImgRef, centerOverlayTintRef, centerOverlayTextRef,
    isCenterShaking, isLetraActive, toggleLetraActive, vocalMode, setVocalMode,
    onNavigateMeasure, handleCanvasPointerDown, pedagogyTarget, setPedagogyTarget,
    isMobile: props.isMobile ?? false,
  };
}
