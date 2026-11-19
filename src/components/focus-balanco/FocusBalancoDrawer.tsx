import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useSequencerStore } from '../../stores/useSequencerStore';
import { useTransportStore } from '../../stores/useTransportStore';
import { useAudio } from '../../contexts/AudioContext';
import { getMeasureDurationSec } from '../../utils/meterTiming';
import { getPlayableFocusTracks } from '../../utils/focusTrackSelector';
import { getAudioTime } from '../circle-sequencer/circleAudioTime';
import {
  getIsFocusBalancoDrawerOpen, isBalancoMorphCycleActive, resetLiveBalancoMorphToUnity,
  setFocusBalancoDrawerOpen, setManualBalancoMorphScale, startBalancoMorphCycle, subscribeFocusBalancoDrawer,
} from '../../audio/groove/liveBalancoMorph';
import { resolveFocusMeasureSteps } from './resolveFocusMeasureSteps';
import { useFocusBalancoRaf } from './useFocusBalancoRaf';
import { FocusBalancoControlsBar } from './FocusBalancoControlsBar';
import { FocusBalancoBrickStrip } from './FocusBalancoBrickStrip';

interface FocusBalancoDrawerProps {
  compact?: boolean;
  isActiveView?: boolean;
}

export const FocusBalancoDrawer: React.FC<FocusBalancoDrawerProps> = ({ compact = false, isActiveView = true }) => {
  const isOpen = useSyncExternalStore(subscribeFocusBalancoDrawer, getIsFocusBalancoDrawerOpen, getIsFocusBalancoDrawerOpen);
  const audio = useAudio();
  const lang = useSequencerStore((s) => s.lang);
  const tracks = useSequencerStore((s) => s.tracks);
  const focusTrackId = useSequencerStore((s) => s.focusTrackId);
  const storeMeasure = useSequencerStore((s) => s.currentMeasure);
  const timeSig = useSequencerStore((s) => s.timeSig);
  const measureTimeSigs = useSequencerStore((s) => s.measureTimeSigs);
  const bpm = useSequencerStore((s) => s.bpm);
  const measureBpms = useSequencerStore((s) => s.measureBpms);
  const isLeftHanded = useSequencerStore((s) => s.isLeftHanded);
  const isPlaying = useSequencerStore((s) => s.isPlaying);
  const globalSwing = useTransportStore((s) => s.globalSwing);
  const soloPatternPlayId = useTransportStore((s) => s.soloPatternPlayId);

  const [liveMeasure, setLiveMeasure] = useState<number>(storeMeasure);
  const [isCycleActive, setIsCycleActive] = useState<boolean>(() => isBalancoMorphCycleActive());

  useEffect(() => { if (!isPlaying) setLiveMeasure(storeMeasure); }, [isPlaying, storeMeasure]);
  useEffect(() => { if (!isActiveView) resetLiveBalancoMorphToUnity(); }, [isActiveView]);
  useEffect(() => () => { resetLiveBalancoMorphToUnity(); }, []);

  const stripWidthRef = useRef<number>(0);
  const brickRefs = useRef<(HTMLDivElement | null)[]>([]);
  const tensionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flashRefs = useRef<(HTMLDivElement | null)[]>([]);
  const offsetLabelRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);
  const sliderFillRef = useRef<HTMLDivElement | null>(null);
  const sliderThumbRef = useRef<HTMLDivElement | null>(null);
  const scaleBadgeRef = useRef<HTMLSpanElement | null>(null);
  const phaseBadgeRef = useRef<HTMLSpanElement | null>(null);
  const isDraggingSliderRef = useRef<boolean>(false);
  const liveMeasureDurationRef = useRef<number>(2.4);

  const effectiveMeasure = isPlaying ? liveMeasure : storeMeasure;
  const focusTrack = useMemo(() => {
    if (focusTrackId !== null) {
      const found = tracks.find((t) => t.id === focusTrackId);
      if (found) return found;
    }
    return getPlayableFocusTracks(tracks)[0] ?? tracks[0] ?? null;
  }, [tracks, focusTrackId]);

  const model = useMemo(() => resolveFocusMeasureSteps({
    focusTrack, tracks, measureIdx: effectiveMeasure, timeSig, measureTimeSigs,
    soloPatternPlayId, globalSwing, isLeftHanded, isPlaying, lang,
  }), [focusTrack, tracks, effectiveMeasure, timeSig, measureTimeSigs, soloPatternPlayId, globalSwing, isLeftHanded, isPlaying, lang]);

  useFocusBalancoRaf({
    isOpen: isOpen && isActiveView,
    model, lang, stripWidthRef, brickRefs, tensionRefs, flashRefs, offsetLabelRefs,
    playheadRef, sliderRef, sliderFillRef, sliderThumbRef, scaleBadgeRef, phaseBadgeRef,
    isDraggingSliderRef, liveMeasureDurationRef,
    onLiveMeasureChange: setLiveMeasure,
    onCycleActiveChange: setIsCycleActive,
  });

  const handleToggleCycle = useCallback(() => {
    if (isBalancoMorphCycleActive()) {
      setManualBalancoMorphScale(1.0, true);
      setIsCycleActive(false);
      return;
    }
    const curSig = measureTimeSigs?.[effectiveMeasure] || timeSig || '4/4';
    const curBpm = measureBpms?.[effectiveMeasure] || bpm || 100;
    const estDur = liveMeasureDurationRef.current > 0 ? liveMeasureDurationRef.current : getMeasureDurationSec(curSig, curBpm);
    if (!audio.isPlaying) {
      startBalancoMorphCycle(0, estDur, true);
      setIsCycleActive(true);
      audio.handleTogglePlay();
    } else {
      startBalancoMorphCycle(getAudioTime(), estDur, false);
      setIsCycleActive(true);
    }
  }, [audio, effectiveMeasure, measureTimeSigs, timeSig, measureBpms, bpm]);

  if (!isOpen || !isActiveView) return null;

  return (
    <section
      data-testid="focus-balanco-drawer"
      aria-label={lang === 'pt' ? 'Visualizador ao vivo do Balanço' : 'Visualiseur dynamique du Balanço'}
      className={`w-full shrink-0 z-30 border-t-2 border-[var(--cordel-border-strong)] bg-[var(--cordel-surface-elevated)] text-[var(--cordel-text)] shadow-[0_-3px_10px_var(--cordel-shadow-color)] flex flex-col gap-1.5 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}
    >
      <FocusBalancoControlsBar
        model={model} lang={lang} compact={compact} isCycleActive={isCycleActive}
        onToggleCycle={handleToggleCycle} onClose={() => setFocusBalancoDrawerOpen(false)}
        sliderRef={sliderRef} sliderFillRef={sliderFillRef} sliderThumbRef={sliderThumbRef}
        scaleBadgeRef={scaleBadgeRef} phaseBadgeRef={phaseBadgeRef}
        isDraggingSliderRef={isDraggingSliderRef}
      />
      <FocusBalancoBrickStrip
        model={model} compact={compact} stripWidthRef={stripWidthRef}
        brickRefs={brickRefs} tensionRefs={tensionRefs} flashRefs={flashRefs}
        offsetLabelRefs={offsetLabelRefs} playheadRef={playheadRef}
      />
    </section>
  );
};
