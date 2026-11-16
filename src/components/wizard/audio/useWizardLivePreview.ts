import React, { useState, useRef, useEffect, useCallback } from 'react';
import { getAudioEngine } from '../../../hooks/audio-sync/audioEngineNodes';
import { useSequencerStore } from '../../../stores/useSequencerStore';
import { useWizardStore } from '../../../stores/useWizardStore';
import { resolveStepsPerMeasure } from '../wizardRhythmPatterns';
import {
  preloadWizardInstruments,
  stopAllWizardSpatialNodes,
  unlockAndWarmWizardAudio,
} from './wizardSpatialPreview';
import { scheduleWizardPreviewTicks, WizardPreviewClockState } from './wizardLivePreviewScheduler';

export interface WizardLivePreviewController {
  isPreviewPlaying: boolean;
  isPreloading: boolean;
  progressFillRef: React.RefObject<HTMLDivElement | null>;
  beatLabelRef: React.RefObject<HTMLSpanElement | null>;
  togglePreview: () => void;
  stopPreview: () => void;
}

export function useWizardLivePreview(sequencer: any): WizardLivePreviewController {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreloading, setIsPreloading] = useState(false);
  const progressFillRef = useRef<HTMLDivElement | null>(null);
  const beatLabelRef = useRef<HTMLSpanElement | null>(null);

  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const barAnchorTimeRef = useRef(0);
  const clockRef = useRef<WizardPreviewClockState>({ stepIdx: 0, measureIdx: 0, nextStepTime: 0 });

  const stopPreview = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopAllWizardSpatialNodes();
    if (progressFillRef.current) progressFillRef.current.style.transform = 'scaleX(0)';
    if (beatLabelRef.current) beatLabelRef.current.textContent = '1';
    if (mountedRef.current) {
      setIsPreviewPlaying(false);
      setIsPreloading(false);
    }
  }, []);

  const startPreview = useCallback(async () => {
    const st = useWizardStore.getState();
    if (st.placedInstruments.length === 0 || (!st.selectedBasePatternId && !st.selectedCloudSectionData)) return;

    if (useSequencerStore.getState().isPlaying || sequencer?.isPlaying) {
      sequencer?.handleStop?.();
    }

    unlockAndWarmWizardAudio();
    const engine = getAudioEngine();
    if (!engine) return;

    setIsPreloading(true);
    await preloadWizardInstruments(st.placedInstruments.map((i) => i.instrumentType));
    if (!mountedRef.current) return;
    setIsPreloading(false);

    const ctx = engine.getAudioContext();
    const startAt = ctx.currentTime + 0.04;
    clockRef.current = { stepIdx: 0, measureIdx: 0, nextStepTime: startAt };
    barAnchorTimeRef.current = startAt;
    setIsPreviewPlaying(true);

    scheduleWizardPreviewTicks(ctx, clockRef.current);
    timerRef.current = window.setInterval(() => scheduleWizardPreviewTicks(ctx, clockRef.current), 25);

    const animate = () => {
      const live = useWizardStore.getState();
      const steps = resolveStepsPerMeasure(live.timeSig);
      const beats = Math.max(1, Math.round(steps / 4));
      const barDur = beats * (60 / Math.max(40, Math.min(240, live.bpm || 96)));
      const elapsed = Math.max(0, ctx.currentTime - barAnchorTimeRef.current);
      const phase = barDur > 0 ? (elapsed % barDur) / barDur : 0;
      if (progressFillRef.current) progressFillRef.current.style.transform = `scaleX(${phase.toFixed(4)})`;
      if (beatLabelRef.current) beatLabelRef.current.textContent = String(Math.min(beats, Math.floor(phase * beats) + 1));
      rafRef.current = window.requestAnimationFrame(animate);
    };
    rafRef.current = window.requestAnimationFrame(animate);
  }, [sequencer]);

  const togglePreview = useCallback(() => {
    if (isPreviewPlaying) stopPreview();
    else void startPreview();
  }, [isPreviewPlaying, startPreview, stopPreview]);

  const hasRhythm = useWizardStore((s) => Boolean(s.selectedBasePatternId || s.selectedCloudSectionData));
  const hasInstruments = useWizardStore((s) => s.placedInstruments.length > 0);

  useEffect(() => {
    if (isPreviewPlaying && (!hasRhythm || !hasInstruments)) stopPreview();
  }, [isPreviewPlaying, hasRhythm, hasInstruments, stopPreview]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPreview();
    };
  }, [stopPreview]);

  return { isPreviewPlaying, isPreloading, progressFillRef, beatLabelRef, togglePreview, stopPreview };
}
